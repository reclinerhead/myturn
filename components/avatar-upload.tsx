"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadAvatar } from "@/app/avatars/actions";
import { Avatar } from "@/components/avatar";

const OUTPUT_SIZE = 512;

/* Tap an avatar, pick a photo, done — no crop UI, no modal (Mom-proof).
   The photo is center-cropped square and resized to 512px on the
   client, honoring EXIF orientation, so phone photos land upright and
   small. One upload propagates everywhere via people.photoUrl. */
export function AvatarUpload({
  person,
  size,
}: {
  person: {
    id: string;
    name: string;
    monogram: string;
    color: string;
    photoUrl: string | null;
  };
  size: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
      } catch {
        bitmap = await createImageBitmap(file);
      }
      const side = Math.min(bitmap.width, bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      canvas
        .getContext("2d")!
        .drawImage(
          bitmap,
          (bitmap.width - side) / 2,
          (bitmap.height - side) / 2,
          side,
          side,
          0,
          0,
          OUTPUT_SIZE,
          OUTPUT_SIZE,
        );
      bitmap.close();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (!blob) return;
      const formData = new FormData();
      formData.append("photo", new File([blob], `${person.id}.jpg`));
      await uploadAvatar(person.id, formData);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Add a photo of ${person.name}`}
        className={`cursor-pointer rounded-full ${busy ? "opacity-50" : ""}`}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Avatar person={person} size={size} />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </>
  );
}
