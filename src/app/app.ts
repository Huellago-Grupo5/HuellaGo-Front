import { Component } from '@angular/core';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  constructor(_language: LanguageService) {}
}
