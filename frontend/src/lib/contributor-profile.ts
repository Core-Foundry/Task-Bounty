export type ContributorProfileField = {
  key: string;
  label: string;
  value?: string;
};

export type ContributorProfileCompletion = {
  percentage: number;
  completedCount: number;
  totalCount: number;
  missingFields: ContributorProfileField[];
};

export function calculateContributorProfileCompletion(
  profile: Record<string, string | undefined>,
  fields: ContributorProfileField[],
): ContributorProfileCompletion {
  const completedCount = fields.filter(({ key }) => {
    const value = profile[key];
    return typeof value === "string" && value.trim().length > 0;
  }).length;

  const totalCount = fields.length;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    percentage,
    completedCount,
    totalCount,
    missingFields: fields.filter(({ key }) => {
      const value = profile[key];
      return typeof value !== "string" || value.trim().length === 0;
    }),
  };
}
