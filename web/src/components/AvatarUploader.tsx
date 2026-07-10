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
              window: "#ffffff",
              windowBorder: "#4b3f8f",
              tabIcon: "#4b3f8f",
              menuIcons: "#6f6a7d",
              textDark: "#3d3a45",
              textLight: "#fbfaf7",
              link: "#4b3f8f",
              action: "#4b3f8f",
              inactiveTabIcon: "#6f6a7d",
              error: "#96543f",
              inProgress: "#4b3f8f",
              complete: "#4d7245",
              sourceBg: "#f4f2ee",
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
              className="text-sm px-4 py-2 rounded-full bg-[rgba(75,63,143,0.12)] border border-[rgba(75,63,143,0.22)] text-[#4b3f8f] hover:bg-[rgba(75,63,143,0.2)] transition-colors flex items-center gap-2"
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
            className="text-sm px-4 py-2 rounded-full bg-[rgba(193,77,58,0.1)] border border-[rgba(193,77,58,0.2)] text-[#96543f] hover:bg-[rgba(193,77,58,0.2)] transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
