import { RequireAuth } from '@/components/RequireAuth';
import { ChatListScreen } from '@/features/experience/ChatListScreen';

export default function TouristChatsRoute() {
  return (
    <RequireAuth role="tourist">
      <ChatListScreen role="tourist" />
    </RequireAuth>
  );
}
