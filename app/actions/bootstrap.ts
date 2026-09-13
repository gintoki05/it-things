"use server"

import { fetchDesktopMemoAction, type DbDesktopMemo } from "./memo"
import { fetchModulePicsAction, type DbModulePic } from "./pic"
import { fetchLapakItemsAction, type DbLapakItem } from "./lapak"
import { fetchNotificationBadgesAction, type NotificationBadgesResult } from "./badges"
import { getUnreadChatCountAction } from "./chat"

export interface DesktopBootstrapResult {
  memo: DbDesktopMemo | null
  pics: DbModulePic[]
  lapak: DbLapakItem[]
  badges: NotificationBadgesResult
  unreadChatCount: number
}

export async function getDesktopBootstrapAction(params: {
  lastReadChat?: string | null
  userId?: string | null
  token?: string | null
}): Promise<DesktopBootstrapResult> {
  const token = params.token || null

  const [memoRes, picsRes, lapakRes, badgesRes, unreadRes] = await Promise.all([
    fetchDesktopMemoAction(token),
    fetchModulePicsAction(token),
    fetchLapakItemsAction(token),
    fetchNotificationBadgesAction(token),
    params.lastReadChat
      ? getUnreadChatCountAction({
          lastRead: params.lastReadChat,
          userId: params.userId,
          token,
        })
      : Promise.resolve({ count: 0 }),
  ])

  return {
    memo: memoRes.data,
    pics: picsRes.data,
    lapak: lapakRes.data,
    badges: badgesRes,
    unreadChatCount: unreadRes.count ?? 0,
  }
}
