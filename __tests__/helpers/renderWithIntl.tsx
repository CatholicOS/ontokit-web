import type { ReactElement } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

import enMessages from "@/messages/en.json";

/**
 * Renders a component inside a `NextIntlClientProvider`, mirroring the provider
 * mounted in `app/layout.tsx`. Any component calling `useTranslations()` throws
 * without it.
 *
 * The real `messages/en.json` is used rather than a stub so assertions keep
 * matching on the strings users actually see, and a missing or renamed key
 * fails the test instead of silently echoing the key back.
 */
export function renderWithIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
): RenderResult {
  return render(ui, {
    ...options,
    wrapper: ({ children }) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        {children}
      </NextIntlClientProvider>
    ),
  });
}
