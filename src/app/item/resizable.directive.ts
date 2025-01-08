import {Directive, ElementRef, Input, OnInit} from '@angular/core';

@Directive({
  selector: '[appResizable]' // Attribute selector
})

export class ResizableDirective implements OnInit {


  @Input() resizableGrabWidth = 8;
  @Input() resizableMinWidth = 500;
  @Input() resizableMaxWidth = 1200;


  dragging = false;

  constructor(private el: ElementRef) {

    function preventGlobalMouseEvents() {
      document.body.style['pointer-events'] = 'none';
    }

    function restoreGlobalMouseEvents() {
      document.body.style['pointer-events'] = 'auto';
    }


    const newWidth = (wid) => {
      // tslint:disable-next-line:no-shadowed-variable
      const newWidth = Math.max(this.resizableMinWidth, wid);
      if (newWidth < this.resizableMaxWidth) {
        el.nativeElement.style.width = (newWidth) + 'px';
      }
    }


    const mouseMoveG = (evt) => {
      if (!this.dragging) {
        return;
      }
      newWidth(evt.clientX - el.nativeElement.offsetLeft)
      evt.stopPropagation();
    };

    const mouseUpG = (evt) => {
      if (!this.dragging) {
        return;
      }
      restoreGlobalMouseEvents();
      this.dragging = false;
      evt.stopPropagation();
    };

    const mouseDown = (evt) => {
      if (this.inDragRegion(evt)) {
        this.dragging = true;
        preventGlobalMouseEvents();
        evt.stopPropagation();
      }
    };


    const mouseMove = (evt) => {
      if (this.inDragRegion(evt) || this.dragging) {
        el.nativeElement.style.cursor = 'col-resize';
      } else {
        el.nativeElement.style.cursor = 'default';
      }
    }


    document.addEventListener('mousemove', mouseMoveG, true);
    document.addEventListener('mouseup', mouseUpG, true);
    el.nativeElement.addEventListener('mousedown', mouseDown, true);
    el.nativeElement.addEventListener('mousemove', mouseMove, true);
  }

  ngOnInit(): void {
    this.el.nativeElement.style['border-right'] = this.resizableGrabWidth + 'px solid darkgrey';
  }

  inDragRegion(evt) {
    return this.el.nativeElement.clientWidth - evt.clientX + this.el.nativeElement.offsetLeft < this.resizableGrabWidth;
  }

}
