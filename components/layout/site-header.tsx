import Link from "next/link";
import { primaryNavigation } from "@/lib/site-navigation";

function Brand() {
  return (
    <span className="brand-mark" aria-label="CurrencyDeaths">
      <span>Currency</span>
      <span className="brand-mark__signal" aria-hidden="true">
        Deaths
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell-container site-header__inner">
        <Link className="site-header__brand" href="/">
          <Brand />
        </Link>

        <nav className="desktop-navigation" aria-label="Primary navigation">
          {primaryNavigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="build-plate">
          <span>Research build</span>
          <strong>Archive / 01</strong>
        </div>

        <details className="mobile-navigation">
          <summary>
            <span>Menu</span>
            <span className="mobile-navigation__glyph" aria-hidden="true" />
          </summary>
          <nav aria-label="Mobile navigation">
            {primaryNavigation.map((item, index) => (
              <Link key={item.href} href={item.href}>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
