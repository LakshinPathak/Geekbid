"use client";
import { CldUploadWidget } from "next-cloudinary";
import CloudinaryAvatar from "./CloudinaryAvatar";
import { Camera, Trash2 } from "lucide-react";

type AvatarUploaderProps = {
  currentAvatarUrl?: string | null;
  avatarInitial: string;
  onUploadSuccess: (result: { url: string; publicId: string }) => void;
  onRemove?: () => void;
};

export default function AvatarUploader({
  currentAvatarUrl,
  avatarInitial,
  onUploadSuccess,
  onRemove,
}: AvatarUploaderProps) {
  return (
    <div className="flex items-center gap-4">
      <CldUploadWidget
        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "geekbid_unsigned"}
        options={{
          folder: "geekbid/avatars",
          cropping: true,
          croppingAspectRatio: 1,
          maxFileSize: 5000000,
          sources: ["local", "camera", "url"],
          theme: "minimal",
          styles: {
            palette: {
              window: "#0d1120",
              windowBorder: "#c9a84c",
              tabIcon: "#c9a84c",
              menuIcons: "#a8997e",
              textDark: "#f0e8d4",
              textLight: "#080b14",
              link: "#c9a84c",
              action: "#c9a84c",
              inactiveTabIcon: "#a8997e",
              error: "#e57373",
              inProgress: "#c9a84c",
              complete: "#4caf7d",
              sourceBg: "#111625",
            },
          },
        }}
        onSuccess={(result) => {
          if (result.event === "success" && result.info && typeof result.info === "object" && "secure_url" in result.info) {
            const info = result.info as { secure_url: string; public_id: string };
            onUploadSuccess({ url: info.secure_url, publicId: info.public_id });
          }
        }}
      >
        {({ open }) => (
          <div className="relative group cursor-pointer" onClick={() => open()}>
            <CloudinaryAvatar
              avatarUrl={currentAvatarUrl}
              avatarInitial={avatarInitial}
              size="lg"
            />
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>
        )}
      </CldUploadWidget>

      <div className="flex flex-col gap-2">
        <CldUploadWidget
          uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "geekbid_unsigned"}
          options={{
            folder: "geekbid/avatars",
            cropping: true,
            croppingAspectRatio: 1,
            maxFileSize: 5000000,
            sources: ["local", "camera", "url"],
          }}
          onSuccess={(result) => {
            if (result.event === "success" && result.info && typeof result.info === "object" && "secure_url" in result.info) {
              const info = result.info as { secure_url: string; public_id: string };
              onUploadSuccess({ url: info.secure_url, publicId: info.public_id });
            }
          }}
        >
          {({ open }) => (
            <button
              type="button"
              onClick={() => open()}
              className="text-sm px-4 py-2 rounded-[3px] bg-[rgba(201,168,76,0.12)] border border-[rgba(201,168,76,0.22)] text-[#c9a84c] hover:bg-[rgba(201,168,76,0.2)] transition-colors flex items-center gap-2"
            >
              <Camera className="h-3.5 w-3.5" />
              {currentAvatarUrl ? "Change Photo" : "Upload Photo"}
            </button>
          )}
        </CldUploadWidget>

        {currentAvatarUrl && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm px-4 py-2 rounded-[3px] bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.2)] text-[#e57373] hover:bg-[rgba(192,57,43,0.2)] transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
