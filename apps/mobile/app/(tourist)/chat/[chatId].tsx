import { RequireAuth } from '@/components/RequireAuth';
import { ChatConversationScreen } from '@/features/experience/ChatConversationScreen';

export default function TouristChatRoute() {
  return (
    <RequireAuth role="tourist">
      <ChatConversationScreen role="tourist" />
    </RequireAuth>
  );
}
