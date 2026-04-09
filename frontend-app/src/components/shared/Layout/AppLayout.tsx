import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/shared/Sidebar/Sidebar";

export const AppLayout = () => {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};