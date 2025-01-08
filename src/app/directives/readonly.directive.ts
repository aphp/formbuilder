import {Directive, ElementRef, OnInit, Renderer2} from '@angular/core';
import {AuthService} from "../services/auth.service";

@Directive({
  selector: '[appReadonly]'
})
export class ReadonlyDirective implements OnInit {

  constructor(private el: ElementRef, private renderer: Renderer2, private authService: AuthService) {
  }

  ngOnInit() {
    if (this.authService.hasReadOnlyRole()) {
      this.setDisabledState();
    }
  }

  private setDisabledState() {
    this.renderer.setAttribute(this.el.nativeElement, 'disabled', 'true');
    this.renderer.addClass(this.el.nativeElement, 'disabled-view');
  }
}
