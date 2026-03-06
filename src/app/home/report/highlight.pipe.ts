import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | number | null, search: string): SafeHtml {
    if (value === null || value === undefined) return '';
    const strValue = String(value);
    
    if (!search) return strValue; // Return plain string if no search term

    // Escape regex characters
    const escapeRegex = (str: string) => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapeRegex(search)})`, 'gi');

    const matched = strValue.replace(regex, `<span class="bg-yellow-300 dark:bg-yellow-600/50 text-slate-900 dark:text-white font-bold px-0.5 rounded shadow-sm">$1</span>`);
    
    return this.sanitizer.bypassSecurityTrustHtml(matched);
  }
}
