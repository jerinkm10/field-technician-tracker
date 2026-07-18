import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { appSettings } from '../../core/config/app.settings';

@Component({
  selector: 'app-privacy-policy-page',
  templateUrl: './privacy-policy-page.component.html',
  styleUrl: './privacy-policy-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivacyPolicyPageComponent {
  private readonly title = inject(Title);

  protected readonly appName = appSettings.appName;
  protected readonly effectiveDate = '17 July 2026';
  protected readonly publicUrl = 'https://star.castorwheel.co/privacy-policy';

  constructor() {
    this.title.setTitle(`Privacy Policy | ${this.appName}`);
  }
}
