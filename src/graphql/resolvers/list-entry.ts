import { Store } from 'vuex'
import ApolloClient from 'apollo-client'
import { oc } from 'ts-optchain'

import {
  AddToListMutation,
  AddToListVariables,
  DeleteFromListMutation,
  DeleteFromListVariables,
  EditListEntryMutationVariables,
  ListEntry,
  Media,
  QueryListEntriesArgs,
  SingleMediaQuery,
  SingleMediaQueryVariables,
  SingleMediaSingleMedia,
  StartRewatchingMutation,
  StartRewatchingVariables,
  UpdateProgressMutation,
  UpdateProgressVariables,
  UpdateScoreMutation,
  UpdateScoreMutationVariables,
  UpdateStatusMutation,
  UpdateStatusVariables,
} from '@/graphql/types'
import { getListPlugins } from '@/state/auth'
import { getMainListPlugin } from '@/state/settings'
import { store } from '@/state/store'
import { isNil } from '@/utils'
import { SINGLE_MEDIA_QUERY } from '@/graphql/documents/queries'
import { ListEntryWithoutMedia } from '@/plugins/list/plugin'

const getEnabledPlugins = (store: Store<any>) => {
  const enabledPlugins = getListPlugins(store)
    .filter(p => p.available)
    .map(p => p.name)

  return window.listPlugins.filter(plugin =>
    enabledPlugins.includes(plugin.service),
  )
}

export const GetListEntry = async (
  media: Media | null,
  variables: { mediaId: number } | null,
  _cache: { cache: RealProxy },
): Promise<ListEntryWithoutMedia | null> => {
  const mainListPlugin = getMainListPlugin(store)
  const plugin = window.listPlugins.find(
    plugin => plugin.service === mainListPlugin,
  )

  if (isNil(plugin)) throw new Error('Selected List Plugin could not be found.')

  return plugin.GetListEntry((oc(media).id() || oc(variables).mediaId())!)
}

export const GetListEntries = async (
  _: undefined,
  variables: QueryListEntriesArgs,
  _cache: { cache: RealProxy },
): Promise<ListEntryWithoutMedia[] | null> => {
  const mainListPlugin = getMainListPlugin(store)
  const plugin = window.listPlugins.find(
    plugin => plugin.service === mainListPlugin,
  )

  if (isNil(plugin)) throw new Error('Selected List Plugin could not be found.')

  return plugin.GetListEntries(variables)
}

export const GetMedia = async (
  { mediaId }: ListEntry,
  _: undefined,
  { client }: { cache: RealProxy; client: ApolloClient<any> },
): Promise<SingleMediaSingleMedia> => {
  const result = await client.query<SingleMediaQuery>({
    query: SINGLE_MEDIA_QUERY,
    variables: { mediaId } as SingleMediaQueryVariables,
  })

  return result.data.SingleMedia!
}

export const AddToList = async (
  _root: undefined,
  { anilistId }: AddToListVariables,
  _cache: { cache: RealProxy },
): Promise<AddToListMutation['AddToList']> => {
  const promises = getEnabledPlugins(store).map(plugin =>
    plugin.AddToList(anilistId),
  )
  const results = await Promise.all(promises)

  return results[0]
}

export const DeleteFromList = async (
  _root: undefined,
  { anilistId }: DeleteFromListVariables,
  _cache: { cache: RealProxy },
): Promise<DeleteFromListMutation['DeleteFromList']> => {
  const promises = getEnabledPlugins(store).map(plugin =>
    plugin.DeleteFromList(anilistId),
  )
  const results = await Promise.all(promises)

  return results[0]
}

export const UpdateStatus = async (
  _root: undefined,
  { anilistId, status }: UpdateStatusVariables,
  _cache: { cache: RealProxy },
): Promise<UpdateStatusMutation['UpdateStatus']> => {
  const promises = getEnabledPlugins(store).map(plugin =>
    plugin.UpdateStatus(anilistId, status),
  )
  const results = await Promise.all(promises)

  return results[0]
}

export const StartRewatching = async (
  _root: undefined,
  { anilistId }: StartRewatchingVariables,
  _cache: { cache: RealProxy },
): Promise<StartRewatchingMutation['StartRewatching']> => {
  const promises = getEnabledPlugins(store).map(plugin =>
    plugin.StartRewatching(anilistId),
  )
  const results = await Promise.all(promises)

  return results[0]
}

export const UpdateProgress = async (
  _root: undefined,
  { anilistId, progress }: UpdateProgressVariables,
  _cache: { cache: RealProxy },
): Promise<UpdateProgressMutation['UpdateProgress']> => {
  const promises = getEnabledPlugins(store).map(plugin =>
    plugin.UpdateProgress(anilistId, progress),
  )
  const results = await Promise.all(promises)

  return results[0]
}

export const UpdateScore = async (
  _root: undefined,
  { anilistId, score }: UpdateScoreMutationVariables,
  _cache: { cache: RealProxy },
): Promise<UpdateScoreMutation['UpdateScore']> => {
  const promises = getEnabledPlugins(store).map(plugin =>
    plugin.UpdateScore(anilistId, score),
  )
  const results = await Promise.all(promises)

  return results[0]
}

export const EditListEntry = async (
  _root: undefined,
  { anilistId, options }: EditListEntryMutationVariables,
  _cache: { cache: RealProxy },
): Promise<UpdateProgressMutation['UpdateProgress']> => {
  const promises = getEnabledPlugins(store).map(plugin =>
    plugin.EditListEntry(anilistId, options),
  )
  const results = await Promise.all(promises)

  return results[0]
}