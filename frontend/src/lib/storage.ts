import { v2 as cloudinary } from "cloudinary";

import { logger, captureException } from "@/lib/logger";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function uploadImageFromDataUrl(
  dataUrl: string,
  folder = "foodnet/uploads",
) {
  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: "image",
      tags: ["foodnet-temp"],
    });

    return {
      key: result.public_id,
      url: result.secure_url,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to upload image to Cloudinary");

    captureException(error);

    throw error;
  }
}

export async function getImageSignedUrl(
  storageKey: string,
  _expiresInSeconds = 3600,
) {
  if (/^https?:\/\//i.test(storageKey)) return storageKey;

  return cloudinary.url(storageKey, {
    secure: true,
    resource_type: "image",
    type: "upload",
    sign_url: true,
  });
}

export async function listStoredImages(before: Date) {
  const resources: Array<{ public_id: string; created_at?: string }> = [];
  let nextCursor: string | undefined;

  do {
    const result = await cloudinary.api.resources_by_tag("foodnet-temp", {
      resource_type: "image",
      type: "upload",
      max_results: 500,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    });

    resources.push(...result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return resources
    .filter(
      (resource) =>
        resource.created_at && new Date(resource.created_at).getTime() < before.getTime(),
    )
    .map((resource) => resource.public_id);
}

export async function deleteStoredImages(publicIds: string[]) {
  for (let index = 0; index < publicIds.length; index += 100) {
    await cloudinary.api.delete_resources(publicIds.slice(index, index + 100), {
      resource_type: "image",
      type: "upload",
      invalidate: true,
    });
  }
}
