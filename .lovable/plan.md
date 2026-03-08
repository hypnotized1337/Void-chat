

## Problem

Video uploads silently fail because the **storage bucket's `allowed_mime_types`** does not include any video MIME types. The client-side code (`ACCEPTED_FILE_TYPES`) correctly lists video types, so the file picker accepts them, but the upload to storage is rejected server-side — the error is caught but only logged to console, so nothing appears in chat.

The latest migration (`20260308050547`) sets allowed types to images, PDF, zip, text, and Word docs only — no video.

## Fix

### 1. Database migration — add video MIME types to bucket

Update the `chat-images` bucket to allow video uploads:

```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'application/pdf', 'application/zip', 'application/x-zip-compressed',
  'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
],
file_size_limit = 52428800
WHERE name = 'chat-images';
```

This adds `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo` and bumps the file size limit to 50MB (videos are larger than images).

### 2. Better error feedback in `use-chat.ts`

Currently the upload error is only `console.error`'d. Add a user-facing toast so failed uploads aren't silent:

```ts
if (error) {
  console.error('Upload failed:', error.message);
  toast.error('Upload failed — file may be too large or unsupported.');
  return;
}
```

That's it — two small changes, one migration and one line of feedback.

