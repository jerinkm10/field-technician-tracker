import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-business-placeholder-page',
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-heading">
          <p class="page-eyebrow">Business</p>
          <h1 class="page-title">{{ pageTitle }}</h1>
          <p class="page-subtitle">{{ pageSubtitle }}</p>
        </div>
      </header>

      <section class="panel section-shell placeholder-card">
        <div class="placeholder-copy">
          <h3>{{ pageTitle }} workspace</h3>
          <p>
            This menu is now wired into the common admin layout. You can build the
            operational workflows here without changing the sidebar structure again.
          </p>
        </div>
      </section>
    </section>
  `,
  styles: [
    `
      .placeholder-card {
        display: grid;
        min-height: 16rem;
        place-items: center;
      }

      .placeholder-copy {
        max-width: 40rem;
        text-align: center;
      }

      .placeholder-copy h3 {
        margin: 0 0 0.75rem;
        color: var(--ftt-brand);
        font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
        font-size: 1.5rem;
      }

      .placeholder-copy p {
        margin: 0;
        color: var(--ftt-muted);
        line-height: 1.7;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessPlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly pageTitle =
    (this.route.snapshot.data['title'] as string | undefined) ?? 'Business';
  protected readonly pageSubtitle =
    (this.route.snapshot.data['subtitle'] as string | undefined) ??
    'Use this area for operational business workflows.';
}
