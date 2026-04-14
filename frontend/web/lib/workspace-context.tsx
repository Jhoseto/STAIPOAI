"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { aiFetch } from "./api";
import { supabase } from "./supabase";

type Workspace = {
  id: string;
  name: string;
  ownerId: string;
};

type WorkspaceContextType = {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspaces = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      let res = await aiFetch<{ items: Workspace[] }>(
        `/v1/workspaces${userId ? `?owner_id=${userId}` : ""}`
      );
      
      // Auto-create a default workspace if none exists
      if (res.items.length === 0 && userId) {
        const newWorkspace = await aiFetch<Workspace>("/v1/workspaces", {
          method: "POST",
          body: JSON.stringify({
            name: "Работна Среда",
            ownerId: userId,
          })
        });
        if (newWorkspace && newWorkspace.id) {
          res.items = [newWorkspace];
        }
      }
      
      setWorkspaces(res.items);

      // Restore from localStorage or pick first
      const savedId = localStorage.getItem("staipo-current-workspace-id");
      const found = res.items.find(w => w.id === savedId) || res.items[0];
      
      if (found) {
        setCurrentWorkspace(found);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspaces();
  }, []);

  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem("staipo-current-workspace-id", currentWorkspace.id);
    }
  }, [currentWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        isLoading,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaces() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspaces must be used within a WorkspaceProvider");
  }
  return context;
}
