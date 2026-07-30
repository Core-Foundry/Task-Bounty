
"use client";

import React, { useState, useMemo } from "react";
import { TaskFilter, type FilterState } from "@/components/TaskFilter";
import { TaskList } from "@/components/TaskList";
import { MOCK_COMPLETED_TASKS } from "@/constants/mock-tasks";

const INITIAL_FILTERS: FilterState = {
  category: "All",
  contributor: "All",
  minReward: "",
  maxReward: "",
  startDate: "",
  endDate: "",
};

export default function CompletedTasksPage() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const filteredTasks = useMemo(() => {
    return MOCK_COMPLETED_TASKS.filter((task) => {
      // Category filter
      if (filters.category !== "All" && task.category !== filters.category) {
        return false;
      }

      // Contributor filter
      if (filters.contributor !== "All" && task.contributor.name !== filters.contributor) {
        return false;
      }

      // Min reward filter
      if (filters.minReward !== "" && task.reward < Number(filters.minReward)) {
        return false;
      }

      // Max reward filter
      if (filters.maxReward !== "" && task.reward > Number(filters.maxReward)) {
        return false;
      }

      // Start date filter
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (task.completionDate < startDate) {
          return false;
        }
      }

      // End date filter
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (task.completionDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full max-w-full">
      <h1 className="text-3xl font-bold text-white">Completed Tasks</h1>
      
      <TaskFilter 
        filters={filters} 
        onFilterChange={setFilters}
        onReset={handleReset}
      />
      
      <TaskList tasks={filteredTasks} />
    </div>
  );
}
