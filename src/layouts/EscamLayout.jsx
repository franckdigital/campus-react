import { Outlet } from 'react-router-dom';
import EscamNavbar from '../components/public/escam/EscamNavbar';
import EscamFooter from '../components/public/escam/EscamFooter';
import ChatbotWidget from '../components/public/ChatbotWidget';

export default function EscamLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <EscamNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <EscamFooter />
      <ChatbotWidget />
    </div>
  );
}
