import Link from 'next/link';

interface Props {
  text: string;
  height: string;
  width: string;
  logo?: React.ReactNode;
  textColor: string;
  onclick: string;
  textSize: string;
}

export default function PrimaryButton({
  text,
  height,
  width,
  logo,
  textColor,
  onclick,
  textSize,
}: Props) {
  return (
    <div>
      <Link
        href={onclick}
        style={{
          height: `${height}px`,
          width: isNaN(Number(width)) ? width : `${width}px`,
          color: textColor,
          fontSize: `${textSize}px`,
        }}
        className="inline-flex justify-center rounded-lg bg-(--color-yellow)"
      >
        <div className="flex items-center justify-center gap-2">
          {logo}
          {text}
        </div>
      </Link>
    </div>
  );
}
