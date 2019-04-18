import gql from 'graphql-tag'
import { oc } from 'ts-optchain'

import {
  AddEntryMutationMutation,
  CacheEpisodesMutation,
  CacheEpisodesVariables,
  DeleteListEntryMutationMutation,
  EpisodeInput,
  EpisodeListVariables,
  MediaListStatus,
  Provider,
  RewatchMutationMutation,
  SetStatusMutationMutation,
  UpdateProgressMutationSaveMediaListEntry,
  UpdateScoreMutationMutation,
} from '@/graphql/types'
import { Instance } from '@/types'

import ADD_ENTRY_MUTATION from './AddEntryMutation.graphql'
import ANIME_PAGE_QUERY from '../views/anime/anime.graphql'
import DELETE_LIST_ENTRY_MUTATION from './DeleteListEntryMutation.graphql'
import SET_STATUS_MUTATION from './SetStatusMutation.graphql'
import UPDATE_SCORE_MUTATION from './UpdateScoreMutation.graphql'
import REWATCH_MUTATION from './RewatchMutation.graphql'
import CACHE_EPISODES_MUTATION from './CacheEpisodes.graphql'
import EPISODE_LIST_QUERY from './EpisodeList.graphql'
import {
  EpisodeMutationObject,
  refetchListQuery,
  writeEpisodeProgressToCache,
} from '@/utils/cache'

export const setStatusMutation = async (
  { $apollo, $store }: Instance,
  id: number,
  status: MediaListStatus,
) =>
  $apollo.mutate<SetStatusMutationMutation>({
    mutation: SET_STATUS_MUTATION,
    variables: { id, status },
    refetchQueries: refetchListQuery($store),
  })

export const rewatchMutation = async (
  { $apollo, $store }: Instance,
  id: number,
) => {
  await $apollo.mutate<RewatchMutationMutation>({
    mutation: REWATCH_MUTATION,
    variables: { id },
    refetchQueries: refetchListQuery($store),
    update: (cache, { data }) => {
      if (!data) return

      const fakeEpisode: EpisodeMutationObject = {
        provider: Provider.Crunchyroll,
        animeId: data.SaveMediaListEntry!.mediaId,
        episodeNumber: 0,
      }
      writeEpisodeProgressToCache(cache, fakeEpisode, 0)
    },
  })
}

export const addEntryMutation = async (
  { $apollo, $store }: Instance,
  mediaId: number,
  status: MediaListStatus,
) =>
  $apollo.mutate<AddEntryMutationMutation>({
    mutation: ADD_ENTRY_MUTATION,
    variables: { mediaId, status },
    refetchQueries: refetchListQuery($store),
    update: (cache, { data }) => {
      if (!data) return

      const cachedData: any = cache.readQuery({
        query: ANIME_PAGE_QUERY,
        variables: { id: mediaId },
      })

      cachedData.anime.mediaListEntry = data.SaveMediaListEntry

      cache.writeQuery({ query: ANIME_PAGE_QUERY, data: cachedData })
    },
  })

export const setScoreMutation = async (
  { $apollo }: Instance,
  id: number,
  score: number,
  oldValues: Partial<UpdateProgressMutationSaveMediaListEntry> = {},
) =>
  $apollo.mutate<UpdateScoreMutationMutation>({
    mutation: UPDATE_SCORE_MUTATION,
    variables: { id, score },
    optimisticResponse: {
      SaveMediaListEntry: {
        __typename: 'MediaList',
        id,
        score,
        progress: oldValues.progress || 0,
        repeat: oldValues.repeat || 0,
        status: oldValues.status || MediaListStatus.Current,
      },
    },
  })

export const deleteListEntryMutation = async (
  { $apollo, $store }: Instance,
  animeId: number,
  entryId: number,
) =>
  $apollo.mutate<DeleteListEntryMutationMutation>({
    mutation: DELETE_LIST_ENTRY_MUTATION,
    variables: { id: entryId },
    refetchQueries: refetchListQuery($store),
    update: cache => {
      const data = cache.readQuery<any>({
        query: ANIME_PAGE_QUERY,
        variables: { id: animeId },
      })
      if (!data || !data.anime) return

      data.anime.mediaListEntry = null

      cache.writeQuery({ query: ANIME_PAGE_QUERY, data })
    },
  })

interface CacheEpisodesAiring {
  AiringSchedule: null | {
    id: number
    episode: number
    airingAt: number
  }
}

export const cacheEpisodes = async (
  { $apollo }: Instance,
  animeId: number,
  provider: Provider,
  episodes: EpisodeInput[],
) => {
  const { data } = await $apollo.query<CacheEpisodesAiring>({
    query: gql`
      query CacheEpisodesAiring($id: Int!) {
        AiringSchedule(mediaId: $id, notYetAired: true) {
          id
          episode
          airingAt
        }
      }
    `,
    variables: { id: animeId },
    errorPolicy: 'ignore',
  })

  const airing = oc(data).AiringSchedule.airingAt(0) * 1000

  return $apollo.mutate<CacheEpisodesMutation>({
    mutation: CACHE_EPISODES_MUTATION,
    variables: {
      id: animeId,
      provider,
      episodes,
      nextEpisodeAiringAt: airing !== 0 ? airing : null,
    } as CacheEpisodesVariables,
    refetchQueries: [
      {
        query: EPISODE_LIST_QUERY,
        variables: {
          id: animeId,
          provider,
        } as EpisodeListVariables,
      },
    ],
  })
}
