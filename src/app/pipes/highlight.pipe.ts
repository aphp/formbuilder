import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
})
export class HighlightPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) { }

  transform(text: string, search: string): string {
    if (!search) {
      return text;
    }

    const regex =
      new RegExp(
        this.sanitizer.sanitize(SecurityContext.HTML, search), 'gi'
      );
    const match = text.match(regex);

    if (!match) {
      return text;
    }

    return text.replace(regex, `<span class='highlight'>${match[0]}</span>`);
  }
}
