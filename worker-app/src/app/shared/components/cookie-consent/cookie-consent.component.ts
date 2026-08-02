import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

const STORAGE_KEY = 'worker-job-cookie-consent';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.css',
})
export class CookieConsentComponent implements OnInit {
  visible = false;

  ngOnInit() {
    if (typeof localStorage === 'undefined') return;
    this.visible = !localStorage.getItem(STORAGE_KEY);
  }

  accept() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    }
    this.visible = false;
  }

  reject() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'rejected');
    }
    this.visible = false;
  }
}
