import type { KeyboardEventHandler, MouseEventHandler, PointerEventHandler, Ref } from "react"

/**
 * The black cat artwork (viewBox 0 0 220 220). Purely presentational:
 * every animatable part carries a `cat-*` class that BlackCat targets with GSAP.
 */
interface CatSvgProps {
  ref?: Ref<SVGSVGElement>
  idPrefix: string
  label: string
  signImage?: string | null
  onClick?: MouseEventHandler<SVGSVGElement>
  onKeyDown?: KeyboardEventHandler<SVGSVGElement>
  onPointerEnter?: PointerEventHandler<SVGSVGElement>
  onPointerLeave?: PointerEventHandler<SVGSVGElement>
}

const TAIL_PATH = "M140 196 C 186 202, 204 170, 190 142 C 181 124, 192 106, 202 102"

export function CatSvg({ ref, idPrefix, label, signImage, ...handlers }: CatSvgProps) {
  const clipL = `${idPrefix}-eye-l`
  const clipR = `${idPrefix}-eye-r`

  return (
    <svg
      ref={ref}
      viewBox="0 0 220 220"
      role="button"
      tabIndex={0}
      aria-label={label}
      {...handlers}
      className="block h-auto w-full cursor-pointer overflow-visible rounded-3xl outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
    >
      <defs>
        <clipPath id={clipL}>
          <ellipse cx="91" cy="96" rx="11" ry="12" />
        </clipPath>
        <clipPath id={clipR}>
          <ellipse cx="129" cy="96" rx="11" ry="12" />
        </clipPath>
      </defs>

      {/* ground shadow */}
      <ellipse cx="112" cy="210" rx="62" ry="6" fill="var(--cat-shadow)" />

      {/* yarn ball (only visible while working) */}
      <g className="cat-yarn" opacity="0">
        <path
          className="cat-yarn-thread"
          d="M58 206 C 64 212, 76 208, 84 212"
          fill="none"
          stroke="var(--cat-yarn)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <g className="cat-yarn-spin">
          <circle cx="48" cy="199" r="11" fill="var(--cat-yarn)" />
          <path
            d="M39 193 Q48 199 57 193 M38 199 Q48 206 58 199 M40 205 Q48 210 56 205 M44 189 Q41 199 45 209 M52 189 Q56 199 52 209"
            fill="none"
            stroke="var(--cat-yarn-shade)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </g>
      </g>

      <g className="cat-all">
        <g className="cat-tail" fill="none" strokeLinecap="round">
          <path d={TAIL_PATH} stroke="var(--cat-rim)" strokeWidth="17" />
          <path d={TAIL_PATH} stroke="var(--cat-fur)" strokeWidth="13" />
        </g>

        <g className="cat-body">
          <path
            d="M72 206 C 60 172, 68 130, 110 122 C 152 130, 160 172, 148 206 Z"
            fill="var(--cat-fur)"
            stroke="var(--cat-rim)"
            strokeWidth="2"
          />
          <ellipse cx="110" cy="166" rx="17" ry="27" fill="var(--cat-fur-shade)" opacity="0.7" />
        </g>

        {/* front paws: the left one swats the yarn */}
        <g className="cat-paw-l">
          <ellipse cx="94" cy="204" rx="13" ry="7" fill="var(--cat-fur)" stroke="var(--cat-rim)" strokeWidth="2" />
          <path d="M90 205 v-3 M96 205 v-3" stroke="var(--cat-fur-shade)" strokeWidth="1.6" strokeLinecap="round" />
        </g>
        <g className="cat-paw-r">
          <ellipse cx="126" cy="204" rx="13" ry="7" fill="var(--cat-fur)" stroke="var(--cat-rim)" strokeWidth="2" />
          <path d="M122 205 v-3 M128 205 v-3" stroke="var(--cat-fur-shade)" strokeWidth="1.6" strokeLinecap="round" />
        </g>

        <g className="cat-head">
          <g className="cat-head-pose">
            {/* ears */}
            <g className="cat-ear-l">
              <path
                d="M70 80 L64 32 L100 58 Z"
                fill="var(--cat-fur)"
                stroke="var(--cat-fur)"
                strokeWidth="7"
                strokeLinejoin="round"
              />
              <path d="M74 70 L71 44 L91 60 Z" fill="var(--cat-ear)" strokeLinejoin="round" />
            </g>
            <g className="cat-ear-r">
              <path
                d="M150 80 L156 32 L120 58 Z"
                fill="var(--cat-fur)"
                stroke="var(--cat-fur)"
                strokeWidth="7"
                strokeLinejoin="round"
              />
              <path d="M146 70 L149 44 L129 60 Z" fill="var(--cat-ear)" strokeLinejoin="round" />
            </g>

            {/* head */}
            <path
              d="M110 54 C 146 54, 162 76, 160 100 C 158 124, 138 136, 110 136 C 82 136, 62 124, 60 100 C 58 76, 74 54, 110 54 Z"
              fill="var(--cat-fur)"
              stroke="var(--cat-rim)"
              strokeWidth="2"
            />
            {/* cheek fluff */}
            <path
              d="M62 108 l-7 4 l8 1 l-5 5 l9 -1 M158 108 l7 4 l-8 1 l5 5 l-9 -1"
              fill="var(--cat-fur)"
              stroke="var(--cat-fur)"
              strokeWidth="3"
              strokeLinejoin="round"
            />

            {/* eyes */}
            <g className="cat-eye-open">
              <g className="cat-eye">
                <ellipse className="cat-eye-ball" cx="91" cy="96" rx="11" ry="12" fill="var(--cat-eye)" />
                <g clipPath={`url(#${clipL})`}>
                  <g className="cat-pupils">
                    <ellipse className="cat-pupil" cx="91" cy="96" rx="3.2" ry="9" fill="var(--cat-pupil)" />
                    <circle cx="87.5" cy="91.5" r="2.3" fill="#fff" opacity="0.9" />
                  </g>
                </g>
              </g>
              <g className="cat-eye">
                <ellipse className="cat-eye-ball" cx="129" cy="96" rx="11" ry="12" fill="var(--cat-eye)" />
                <g clipPath={`url(#${clipR})`}>
                  <g className="cat-pupils">
                    <ellipse className="cat-pupil" cx="129" cy="96" rx="3.2" ry="9" fill="var(--cat-pupil)" />
                    <circle cx="125.5" cy="91.5" r="2.3" fill="#fff" opacity="0.9" />
                  </g>
                </g>
              </g>
            </g>
            <g className="cat-eye-closed" opacity="0">
              <path
                d="M81 97 Q91 104 101 97 M119 97 Q129 104 139 97"
                fill="none"
                stroke="var(--cat-eye)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>

            {/* blush */}
            <g className="cat-blush" opacity="0">
              <ellipse cx="78" cy="112" rx="7" ry="3.5" fill="var(--cat-nose)" opacity="0.6" />
              <ellipse cx="142" cy="112" rx="7" ry="3.5" fill="var(--cat-nose)" opacity="0.6" />
            </g>

            {/* mouth (open for meows and yawns), nose, whiskers */}
            <path
              className="cat-mouth-open"
              d="M103 115.5 Q110 114 117 115.5 Q116 126 110 126 Q104 126 103 115.5 Z"
              fill="var(--cat-mouth)"
              opacity="0"
            />
            <path d="M105.5 108 L114.5 108 L110 113.5 Z" fill="var(--cat-nose)" strokeLinejoin="round" />
            <path
              d="M110 113.5 Q107 119.5 101.5 117 M110 113.5 Q113 119.5 118.5 117"
              fill="none"
              stroke="var(--cat-whisker)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M84 110 L52 104 M84 114 L50 117 M136 110 L168 104 M136 114 L170 117"
              stroke="var(--cat-whisker)"
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>
        </g>

        {/* collar + bell */}
        <path d="M80 129 Q110 143 140 129" fill="none" stroke="var(--cat-collar)" strokeWidth="5" strokeLinecap="round" />
        <g className="cat-bell">
          <circle cx="110" cy="140" r="6.5" fill="var(--cat-bell)" />
          <path d="M104 140 h12 M110 142.5 v3" stroke="var(--cat-bell-shade)" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="108" cy="137.5" r="1.4" fill="#fff" opacity="0.7" />
        </g>

        {/* sign held up in the "present" mood */}
        <g className="cat-sign" opacity="0">
          <rect x="70" y="126" width="80" height="80" rx="9" fill="#ffffff" stroke="var(--cat-rim)" strokeWidth="1.5" />
          {signImage && <image href={signImage} x="74" y="130" width="72" height="72" preserveAspectRatio="xMidYMid meet" />}
          <ellipse cx="71" cy="178" rx="8" ry="10" fill="var(--cat-fur)" stroke="var(--cat-rim)" strokeWidth="1.5" />
          <ellipse cx="149" cy="178" rx="8" ry="10" fill="var(--cat-fur)" stroke="var(--cat-rim)" strokeWidth="1.5" />
        </g>
      </g>

      {/* zzz */}
      <g fill="var(--cat-zzz)" className="font-display font-bold">
        <text className="cat-zzz" x="160" y="62" fontSize="13" opacity="0">
          z
        </text>
        <text className="cat-zzz" x="170" y="48" fontSize="16" opacity="0">
          z
        </text>
        <text className="cat-zzz" x="182" y="32" fontSize="20" opacity="0">
          Z
        </text>
      </g>
    </svg>
  )
}
