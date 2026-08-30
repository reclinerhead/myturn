/* Person avatar: photo when one exists, colored monogram circle otherwise
   (spec: docs/design/myturn-v1.md, "Assets"). Sizes vary per screen
   (84/54/52/44/40/30px...), always a circle; monogram glyph scales at
   0.36 × size, matching the prototype. Person color is data, hence the
   inline style. */
export function Avatar({
  person,
  size,
}: {
  person: { name: string; monogram: string; color: string; photoUrl: string | null };
  size: number;
}) {
  if (person.photoUrl) {
    return (
      /* User-uploaded avatar at exact pixel size; next/image adds nothing
         at 30-84px. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.photoUrl}
        alt={person.name}
        width={size}
        height={size}
        className="flex-none rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex flex-none items-center justify-center rounded-full font-heading tracking-[.02em] text-person-ink"
      style={{
        width: size,
        height: size,
        background: person.color,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {person.monogram}
    </div>
  );
}
