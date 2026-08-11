import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentComponent } from './shared/components/cookie-consent/cookie-consent.component';
import { KeepAliveService } from './core/services/keep-alive.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CookieConsentComponent],
  template: '<router-outlet />\n<app-cookie-consent />',
})
export class AppComponent implements OnInit {
  constructor(private readonly keepAlive: KeepAliveService) {}

  ngOnInit(): void {
    this.keepAlive.start();
  }
}
