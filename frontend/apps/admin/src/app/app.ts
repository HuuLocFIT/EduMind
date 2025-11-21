import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NxWelcome } from './nx-welcome';
import { AdminUi } from '@edumind/admin-ui';

@Component({
  imports: [NxWelcome, RouterModule, AdminUi],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'admin';
}
