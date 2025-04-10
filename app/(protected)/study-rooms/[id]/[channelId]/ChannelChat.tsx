"use client";

import { ChatRoomView } from "@/components/Chat/ChatRoomView";
import { useChatMessages } from "@/hooks/useChatMessages";
import appwriteSDKProvider from "@/lib/appwrite.client";
import { ChatChannel } from "@/types/chat";
import { Server } from "@/utils/config";
import { useEffect } from "react";

const Base_Event = `databases.${Server.dbId}.collections.${Server.messagesCollectionId}.documents`;

export default function ChannelChat({ roomInfo }: { roomInfo: ChatChannel }) {
	const channelId = roomInfo?.$id;
	const { messages, mutateMessages } = useChatMessages(channelId);

	useEffect(() => {
		const unsubscribe = appwriteSDKProvider.client.subscribe(
			`${Base_Event}`,
			(response: { payload: any; events: string | string[] }) => {
				const payload: any = response?.payload;

				if (!payload || payload.channel_Id !== channelId) return;

				// Handle create event
				if (response.events.includes(`${Base_Event}.*.create`)) {
					mutateMessages((prev) => {
						if (!prev) return [payload]; // First message
						const exists = prev.some((msg) => msg.$id === payload.$id);
						if (exists) return prev;
						return [...prev, payload];
					});
				}

				// Handle update event
				if (response.events.includes(`${Base_Event}.*.update`)) {
					mutateMessages((prev) => {
						if (!prev) return prev;
						return prev.map((msg) => (msg.$id === payload.$id ? payload : msg));
					}, false);
				}

				// Handle delete event
				if (response.events.includes(`${Base_Event}.*.delete`)) {
					mutateMessages((prev) => {
						if (!prev) return prev;
						return prev.filter((msg) => msg.$id !== payload.$id);
					}, false);
				}
			}
		);

		// Cleanup subscription on unmount
		return () => unsubscribe();
	}, [channelId, mutateMessages]);

	return <ChatRoomView roomInfo={roomInfo} messages={messages} />;
}
