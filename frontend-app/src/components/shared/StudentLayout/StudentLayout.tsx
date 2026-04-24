import { Outlet } from "react-router-dom";
import { StudentSidebar } from "./StudentSidebar";

export const StudentLayout = () => {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <StudentSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
