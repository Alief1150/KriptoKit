import { Button } from '@/components/ui/button';

type StarOnGithubProps = {
  className?: string;
  href?: string;
};

export default function StarOnGithub({
  className = '',
  href = 'https://github.com/Alief1150/KriptoKit',
}: StarOnGithubProps) {
  return (
    <Button asChild className={`p-0 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="animate-rainbow before:animate-rainbow group relative inline-flex h-10 cursor-pointer items-center justify-center rounded-md border-0 bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,hsl(0,100%,63%),hsl(90,100%,63%),hsl(210,100%,63%),hsl(195,100%,63%),hsl(270,100%,63%))] bg-[length:200%] [background-clip:padding-box,border-box,border-box] [background-origin:border-box] px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors transition-transform duration-200 [border:calc(0.08*1rem)_solid_transparent] before:absolute before:bottom-[-20%] before:left-1/2 before:z-[0] before:h-[20%] before:w-[60%] before:-translate-x-1/2 before:bg-[linear-gradient(90deg,hsl(0,100%,63%),hsl(90,100%,63%),hsl(210,100%,63%),hsl(195,100%,63%),hsl(270,100%,63%))] before:[filter:blur(calc(0.8*1rem))] hover:scale-105 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,hsl(0,100%,63%),hsl(90,100%,63%),hsl(210,100%,63%),hsl(195,100%,63%),hsl(270,100%,63%))]"
      >
        <div className="flex items-center text-white">
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.71.5.1.68-.22.68-.48 0-.24-.01-.86-.01-1.69-2.79.62-3.38-1.38-3.38-1.38-.46-1.2-1.12-1.52-1.12-1.52-.92-.65.07-.64.07-.64 1.02.07 1.56 1.08 1.56 1.08.9 1.58 2.36 1.12 2.94.86.09-.66.35-1.12.63-1.38-2.22-.26-4.56-1.13-4.56-5.02 0-1.11.38-2.02 1.01-2.73-.1-.26-.44-1.31.1-2.73 0 0 .82-.27 2.7 1.04a9.1 9.1 0 0 1 4.92 0c1.88-1.31 2.7-1.04 2.7-1.04.54 1.42.2 2.47.1 2.73.63.71 1.01 1.62 1.01 2.73 0 3.9-2.35 4.75-4.58 5 .36.32.68.95.68 1.91 0 1.38-.01 2.49-.01 2.83 0 .27.18.59.69.48A10.25 10.25 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
          </svg>
          <span className="ml-1 inline-block p-1">Star on GitHub</span>
        </div>
        <div className="ml-2 flex items-center gap-1 text-sm md:flex">
          <svg
            className="size-4 text-white transition-all duration-200 group-hover:text-yellow-300"
            data-slot="icon"
            aria-hidden="true"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clipRule="evenodd"
              d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
              fillRule="evenodd"
            />
          </svg>
          <span className="font-display inline-block font-medium tracking-wider text-white tabular-nums dark:text-white">
            1.2k
          </span>
        </div>
      </a>
    </Button>
  );
}
