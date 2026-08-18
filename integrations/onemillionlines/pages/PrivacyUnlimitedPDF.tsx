import React from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Separator } from "@/components/ui/separator";

/**
 * Privacy Policy page for "UnlimitedPDF — Private PDF Editor & Toolbox".
 * Route: /privacy/unlimitedpdf
 */
export default function PrivacyUnlimitedPDF() {
  return (
    <main className="min-h-screen">
      <Header />

      <section className="mx-auto max-w-4xl px-4 py-10 md:py-14 mt-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">
              Privacy Policy
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              UnlimitedPDF — Private PDF Editor &amp; Toolbox
            </h1>
            <p className="mt-2 text-muted-foreground">
              Chrome Extension &nbsp;·&nbsp; Last updated: August 2026 &nbsp;·&nbsp;{" "}
              <a
                href="https://onemillionlines.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                OneMillionLines
              </a>
            </p>
          </div>

          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 mt-1"
          >
            Back to home
          </Link>
        </div>

        <Separator className="my-8" />

        {/* TL;DR summary */}
        <div className="rounded-xl border border-border bg-muted/40 px-6 py-5 mb-10">
          <p className="font-semibold mb-1">Short version</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            UnlimitedPDF processes files locally on your device. No uploads, no
            accounts, no usage limits imposed by us. There is no analytics,
            telemetry, crash reporting, ads, or tracking. "Unlimited" means no
            product-enforced usage quota, not infinite device capacity.
          </p>
        </div>

        <div className="space-y-10">

          {/* 1. Who we are */}
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Who we are</h2>
            <p className="text-muted-foreground leading-relaxed">
              UnlimitedPDF — Private PDF Editor &amp; Toolbox is a free,
              open-source, privacy-first Chrome browser extension published under
              the{" "}
              <a
                href="https://onemillionlines.com"
                className="underline underline-offset-4 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                OneMillionLines
              </a>{" "}
              project, created by{" "}
              <a
                href="https://www.linkedin.com/in/alexrada/"
                className="underline underline-offset-4 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Alexandru Rada
              </a>
              . If you have questions about this policy, reach us at{" "}
              <a
                href="mailto:hello@onemillionlines.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                hello@onemillionlines.com
              </a>
              .
            </p>
          </section>

          {/* 2. What the extension does */}
          <section>
            <h2 className="text-xl font-semibold mb-3">2. What the extension does</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              UnlimitedPDF edits and converts PDFs entirely on your device. It is
              a free, open-source, privacy-first Manifest V3 Chrome extension. All
              processing runs locally in the browser via bundled open-source
              libraries, with no uploads, no accounts, and no product-enforced
              usage quota.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>View PDFs and read document properties.</li>
              <li>Merge PDFs.</li>
              <li>Split PDFs and extract pages.</li>
              <li>Organize pages: reorder, rotate, delete, duplicate, and reverse.</li>
              <li>Convert images to PDF from JPG, PNG, or WebP files.</li>
              <li>Convert PDF pages to JPG, PNG, or WebP images.</li>
              <li>Add watermarks and page numbers.</li>
              <li>Extract text to TXT.</li>
              <li>Optimize PDFs with lossless repack.</li>
              <li>Compress PDFs with raster compression.</li>
            </ul>
          </section>

          {/* 3. Data we do NOT collect */}
          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data we do not collect</h2>
            <p className="text-muted-foreground mb-4">
              The extension does not collect, transmit, log, store, or share any
              of the following:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>No file uploads.</li>
              <li>No document content, text, or images ever leave your device.</li>
              <li>No filenames, URLs, or titles.</li>
              <li>No browsing history.</li>
              <li>No analytics, telemetry, crash reporting, ads, or tracking.</li>
              <li>No accounts.</li>
              <li>No personal identifiers.</li>
              <li>No cross-site identifiers.</li>
            </ul>
          </section>

          {/* 4. Data we do store */}
          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data we do store — and where</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              UnlimitedPDF stores only a small amount of local settings in your
              browser's local extension storage (
              <code className="text-xs bg-muted px-1 py-0.5 rounded">chrome.storage.local</code>
              ). This data stays on your device and is never sent to us.
            </p>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium mb-1">Settings</p>
                <p className="text-muted-foreground text-sm">
                  Settings may include remembered recent tool names, default
                  export DPI, and UI toggles. Recent tools are tool names only —
                  never filenames, document content, text, or images. Signature
                  storage is not applicable in this version.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium mb-1">Documents and crash recovery</p>
                <p className="text-muted-foreground text-sm">
                  Documents are not persisted after a session unless you turn on
                  <strong> Crash recovery</strong>, which is off by default. If
                  enabled, recoverable temporary data stays locally on your device
                  and can be cleared with one click.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Permissions */}
          <section>
            <h2 className="text-xl font-semibold mb-3">5. Chrome permissions used</h2>
            <p className="text-muted-foreground mb-4">
              The extension requests only the permissions it actually needs. Here
              is what each one is for and what it explicitly does{" "}
              <strong>not</strong> allow:
            </p>
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium mb-1">
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">storage</code>
                </p>
                <p className="text-muted-foreground text-sm">
                  Saves small local settings only. No document content is ever
                  written to storage.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium mb-1">
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">activeTab</code>
                </p>
                <p className="text-muted-foreground text-sm">
                  Lets you explicitly open the PDF currently visible in the active
                  tab, only after you click. It grants no access to other tabs or
                  browsing history.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium mb-1">
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">contextMenus</code>
                  {" "}(optional, off by default)
                </p>
                <p className="text-muted-foreground text-sm">
                  Adds an "Open link in UnlimitedPDF" entry on PDF links. It is
                  requested only if you enable it in Settings.
                </p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="font-medium mb-1">
                  Optional host permissions —{" "}
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">http://*/*</code>,{" "}
                  <code className="text-sm bg-muted px-1 py-0.5 rounded">https://*/*</code>
                </p>
                <p className="text-muted-foreground text-sm">
                  Not granted by default. Requested at runtime for a single site
                  only when you explicitly choose "Use PDF from this tab," so
                  UnlimitedPDF can fetch that one exact PDF file. Used for nothing
                  else.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-4 text-sm">
              The extension does not request and will never request:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">tabs</code>,{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">history</code>,{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">cookies</code>,{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">webRequest</code>,{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">declarativeNetRequest</code>,{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">downloads</code>, or a permanent broad{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;all_urls&gt;</code>{" "}
              host permission.
            </p>
          </section>

          {/* 6. No network requests */}
          <section>
            <h2 className="text-xl font-semibold mb-3">6. No network requests</h2>
            <p className="text-muted-foreground leading-relaxed">
              UnlimitedPDF makes no network requests during document processing.
              All work completes offline. The only network request is the
              user-initiated fetch of the exact active-tab PDF from its own site,
              only after the explicit action. Future optional OCR language packs
              or built-in AI models would download only with consent and would
              never include document data.
            </p>
          </section>

          {/* 7. Security */}
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Security and code integrity</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>
                UnlimitedPDF runs as Manifest V3, the most restrictive and
                security-focused version of the Chrome extension platform.
              </li>
              <li>
                A strict Content Security Policy (
                <code className="text-xs bg-muted px-1 py-0.5 rounded">script-src 'self' 'wasm-unsafe-eval'; object-src 'self'</code>
                ) prevents remote code from running inside extension pages.
              </li>
              <li>
                No remote scripts, no{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">eval</code>, and no CDN
                assets are used.
              </li>
              <li>
                All executable code, including PDF.js and pdf-lib, is bundled
                inside the extension.
              </li>
              <li>Heavy work runs in Web Workers to keep processing isolated and responsive.</li>
              <li>
                Open-source libraries bundled locally include Mozilla PDF.js
                (Apache-2.0), pdf-lib (MIT), fflate (MIT), and Preact (MIT).
              </li>
            </ul>
          </section>

          {/* 8. Data retention */}
          <section>
            <h2 className="text-xl font-semibold mb-3">8. Data retention and deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              Settings persist until you clear them via{" "}
              <strong>Settings → Clear all local data</strong>, remove the
              extension, or clear extension storage from{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">chrome://extensions</code>.
              Documents are not persisted after a session unless Crash recovery is
              enabled, and recoverable temporary data can be cleared locally with
              one click. No request to us is needed — because there is no backend,
              there is nothing for us to hold on your behalf.
            </p>
          </section>

          {/* 9. Children */}
          <section>
            <h2 className="text-xl font-semibold mb-3">9. Children's privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Because the extension collects no personal data from anyone, it does
              not knowingly collect data from children under 13 (or the applicable
              age in your jurisdiction). UnlimitedPDF is a general-purpose
              productivity tool intended for adult users.
            </p>
          </section>

          {/* 10. Your rights */}
          <section>
            <h2 className="text-xl font-semibold mb-3">10. Your rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Because we collect no personal data, there is nothing for us to
              access, correct, port, or delete on your behalf. All data the
              extension stores lives on your own device, under your full control.
              You can clear it at any time without contacting us.
            </p>
          </section>

          {/* 11. Changes */}
          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to this policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              If we make material changes to how the extension handles data, we
              will update this page and the "Last updated" date above and post a
              notice in the Chrome Web Store listing. Continued use of the
              extension after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 12. Contact */}
          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              UnlimitedPDF is part of the{" "}
              <a
                href="https://onemillionlines.com"
                className="underline underline-offset-4 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                One Million Lines
              </a>{" "}
              open-source project. Reach us at{" "}
              <a
                href="mailto:hello@onemillionlines.com"
                className="underline underline-offset-4 hover:text-foreground"
              >
                hello@onemillionlines.com
              </a>{" "}
              or open an issue in the{" "}
              <a
                href="https://github.com/One-Million-Lines/unlimited-pdf"
                className="underline underline-offset-4 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repository
              </a>
              . Because there is no backend, there is nothing for us to collect,
              see, or delete on your behalf.
            </p>
          </section>

        </div>
      </section>

      <Footer />
    </main>
  );
}
