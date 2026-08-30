# Data Retention Rules

This document defines the default retention policy for records that are stale, inactive, or no longer useful in the TaskBounty application.

## Scope

The retention rules apply to persistent in-memory records used by the application runtime, including:

- Notifications created for user activity or platform broadcasts
- Completed, cancelled, or disputed task records
- Related submission and comment records that belong to expired task records

## Categories and retention periods

| Record category | Status / trigger | Retention period | Safe handling |
|---|---|---:|---|
| User notifications | Created and left unread/unused beyond the configured expiry window | 30 days | Delete lazily during read/write operations and when listing notifications |
| Completed task records | Finalized tasks older than the retention window | 180 days | Remove task, submissions, and comments tied to the task after expiry |
| Cancelled task records | Finalized tasks older than the retention window | 180 days | Remove the task and any dependent records after expiry |
| Disputed task records | Finalized tasks older than the retention window | 180 days | Remove the task and related discussion data after expiry |

## Configuration

Retention values are configured through environment variables so deployments can tune policy without changing application code:

- `NEXT_PUBLIC_NOTIFICATION_RETENTION_DAYS` — default `30`
- `NEXT_PUBLIC_TASK_RETENTION_DAYS` — default `180`

If the environment variable is missing or invalid, the defaults above are used.

## Expired record handling

Expired records are removed safely in a lazy cleanup pass before creates, reads, and listing operations. This approach avoids hard-failing operations when old data is present while ensuring stale records do not accumulate indefinitely.

The cleanup process does the following:

1. Identifies records older than the configured retention window.
2. Removes only inactive or finalized records eligible for deletion.
3. Deletes dependent child records (e.g., task submissions/comments) when the parent task is expired.
4. Keeps active or still-valid records intact.

## Operational guidance

- Prefer a short retention period for notifications to avoid indefinite in-memory growth.
- Keep task retention longer than notifications because historical task data may be useful for auditing and review.
- If a stricter compliance requirement is introduced later, update this document and the corresponding environment values together.
