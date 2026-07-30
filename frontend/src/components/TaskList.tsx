
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchX } from "lucide-react";
import type { CompletedTask } from "@/types/task";
import EmptyState from "@/components/EmptyState";

interface TaskListProps {
  tasks: CompletedTask[];
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No tasks found"
        description="Try adjusting your filters to see more results"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full">
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          className="bg-[#0A0B0F]/40 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-3xl transition-all"
        >
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold text-white">{task.title}</CardTitle>
                <CardDescription className="text-muted-foreground">
                  By {task.contributor.name} • Completed on {task.completionDate.toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge className="self-start">{task.reward} {task.rewardToken}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{task.description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{task.category}</Badge>
              <Badge variant="outline">Poster: {task.poster}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
