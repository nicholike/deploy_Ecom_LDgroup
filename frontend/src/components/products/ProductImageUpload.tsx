import { ChangeEvent, KeyboardEvent, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowRightIcon, PlusIcon, TrashBinIcon as TrashIcon } from "../../icons";
import { UploadService } from "../../services/upload.service";

interface ProductImageUploadProps {
  thumbnail?: string;
  images: string[];
  onThumbnailChange: (value: string | undefined) => void;
  onImagesChange: (value: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-xs font-medium text-gray-700 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100";

const deriveAssetBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
  try {
    const parsed = new URL(rawUrl);
    const normalizedPath = parsed.pathname.replace(/\/api(?:\/v\d+)?(?:\/.*)?$/, "");
    parsed.pathname = normalizedPath || "/";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return rawUrl.replace(/\/api(?:\/v\d+)?(?:\/.*)?$/, "");
  }
};

const assetBaseUrl = deriveAssetBaseUrl();

const resolveImageUrl = (value?: string) => {
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }

  const normalizedValue = value.startsWith("/") ? value : `/${value}`;
  return `${assetBaseUrl}${normalizedValue}`;
};

const uniqueAppend = (current: string[], next: string[]) => {
  const set = new Set(current);
  next.forEach((item) => {
    if (item && !set.has(item)) {
      set.add(item);
    }
  });
  return Array.from(set);
};

export function ProductImageUpload({
  thumbnail,
  images,
  onThumbnailChange,
  onImagesChange,
  maxImages,
  disabled = false,
}: ProductImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  const totalImages = images.length + (thumbnail ? 1 : 0);
  const remainingSlots = maxImages ? Math.max(0, maxImages - totalImages) : undefined;

  const handleDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length || disabled) {
      return;
    }

    if (remainingSlots !== undefined && acceptedFiles.length > remainingSlots) {
      setStatusMessage(`You can add up to ${remainingSlots} more image(s).`);
      setStatusType("error");
      return;
    }

    setUploading(true);
    setStatusMessage(null);
    setStatusType(null);

    const uploadedUrls: string[] = [];
    const errors: string[] = [];

    for (const file of acceptedFiles) {
      try {
        const result = await UploadService.uploadProductImage(file);
        uploadedUrls.push(result.url);
      } catch (error: any) {
        console.error("Failed to upload image:", error);
        const rawMessage = error?.message || "Upload failed";
        const message =
          typeof rawMessage === "string" && rawMessage.includes("Unsupported Media Type")
            ? `${file.name}: Upload endpoint chưa hỗ trợ multipart/form-data (Fastify cần @fastify/multipart).`
            : `${file.name}: ${rawMessage}`;
        errors.push(message);
      }
    }

    if (uploadedUrls.length) {
      const nextImages = uniqueAppend(images, uploadedUrls);
      onImagesChange(nextImages);
      if (!thumbnail) {
        onThumbnailChange(uploadedUrls[0]);
      }
      setStatusMessage(`Uploaded ${uploadedUrls.length} image(s) successfully.`);
      setStatusType("success");
    }

    if (errors.length) {
      setStatusMessage(errors.join("\n"));
      setStatusType("error");
    }

    setUploading(false);
  };

  const handleManualInput = (event: ChangeEvent<HTMLInputElement>) => {
    setManualUrl(event.target.value);
  };

  const addManualUrl = () => {
    const trimmed = manualUrl.trim();
    if (!trimmed) {
      return;
    }

    if (remainingSlots !== undefined && remainingSlots <= 0) {
      setStatusMessage("Gallery is full. Remove an image before adding another.");
      setStatusType("error");
      return;
    }

    const nextImages = uniqueAppend(images, [trimmed]);
    onImagesChange(nextImages);
    if (!thumbnail) {
      onThumbnailChange(trimmed);
    }
    setManualUrl("");
    setStatusMessage("Image URL added.");
    setStatusType("success");
  };

  const handleManualKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addManualUrl();
    }
  };

  const handleSetThumbnail = (url: string) => {
    onThumbnailChange(url);
    setStatusMessage("Thumbnail updated.");
    setStatusType("success");
  };

  const handleRemoveImage = (url: string) => {
    const filtered = images.filter((image) => image !== url);
    onImagesChange(filtered);
    if (thumbnail === url) {
      onThumbnailChange(undefined);
    }
    setStatusMessage("Image removed.");
    setStatusType("success");
  };

  const handleClearThumbnail = () => {
    onThumbnailChange(undefined);
    setStatusMessage("Thumbnail cleared.");
    setStatusType("success");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/jpeg": [],
      "image/jpg": [],
      "image/png": [],
      "image/webp": [],
    },
    disabled: disabled || (remainingSlots !== undefined && remainingSlots <= 0),
  });

  const galleryImages = useMemo(() => images.filter(Boolean), [images]);

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs ${
            statusType === "error"
              ? "border-red-100 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200"
              : "border-green-100 bg-green-50 text-green-600 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200"
          }`}
        >
          {statusMessage}
        </div>
      )}

      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition ${
          isDragActive
            ? "border-brand-500 bg-brand-50/60 dark:border-brand-500 dark:bg-brand-900/10"
            : "border-gray-300 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-900/40"
        } ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer hover:border-brand-400"}`}
      >
        <input {...getInputProps()} />
        <PlusIcon className="h-6 w-6 text-brand-500" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {isDragActive ? "Drop images to upload" : "Drag & drop images or click to browse"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          JPG, PNG, WEBP — up to 5MB each
        </p>
        {remainingSlots !== undefined && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Remaining slots: {remainingSlots}
          </p>
        )}
        {uploading && (
          <div className="mt-2 flex items-center gap-2 text-xs text-brand-600 dark:text-brand-300">
            <div className="h-3 w-3 animate-spin rounded-full border border-brand-500 border-t-transparent" />
            Uploading...
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          placeholder="Paste image URL..."
          className={inputClasses}
          value={manualUrl}
          onChange={handleManualInput}
          onKeyDown={handleManualKeyDown}
          disabled={disabled}
        />
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-theme-sm transition hover:bg-brand-600 disabled:opacity-50"
          onClick={addManualUrl}
          disabled={disabled || !manualUrl.trim()}
        >
          Add image
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white/70 px-4 py-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Thumbnail
            </h4>
            {thumbnail && (
              <button
                type="button"
                onClick={handleClearThumbnail}
                className="text-[11px] font-semibold text-red-500 transition hover:text-red-600"
              >
                Remove
              </button>
            )}
          </div>

          {thumbnail ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
              <img
                src={resolveImageUrl(thumbnail)}
                alt="Product thumbnail"
                className="h-48 w-full object-cover"
                loading="lazy"
              />
              <div className="border-t border-gray-200 px-3 py-2 text-center text-[11px] font-semibold text-brand-600 dark:border-gray-700 dark:text-brand-300">
                Current thumbnail
              </div>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/70 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              No thumbnail selected
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
              Gallery Images
            </h4>
            {galleryImages.length > 0 && (
              <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                {galleryImages.length} image{galleryImages.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {galleryImages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
              No gallery images. Upload or add image URLs to populate the gallery.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((url) => {
                const isThumbnail = thumbnail === url;
                return (
                  <div
                    key={url}
                    className={`overflow-hidden rounded-xl border shadow-sm transition ${
                      isThumbnail
                        ? "border-brand-400 ring-2 ring-brand-200 dark:border-brand-500 dark:ring-brand-500/40"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                      <img
                        src={resolveImageUrl(url)}
                        alt="Product gallery"
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-500 shadow-sm transition hover:bg-white dark:bg-gray-900/80 dark:text-red-300"
                        onClick={() => handleRemoveImage(url)}
                        title="Remove image"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white/80 px-3 py-2 text-[11px] dark:border-gray-700 dark:bg-gray-900/40">
                      <button
                        type="button"
                        className={`font-semibold transition ${
                          isThumbnail
                            ? "text-brand-600 dark:text-brand-300"
                            : "text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-300"
                        }`}
                        onClick={() => handleSetThumbnail(url)}
                      >
                        {isThumbnail ? "Thumbnail" : "Set as thumbnail"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductImageUpload;
