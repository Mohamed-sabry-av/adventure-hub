import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
} from '@angular/core';
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from '@angular/animations';
import { UIService } from '../../services/ui.service';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dialog-error',
  templateUrl: './dialog-error.component.html',
  styleUrls: ['./dialog-error.component.css'],
  imports: [AsyncPipe],

  animations: [
    trigger('dialogAnimation', [
      state(
        'open',
        style({
          opacity: 1,
          transform: 'scale(1)',
        })
      ),
      state(
        'closed',
        style({
          opacity: 0,
          transform: 'scale(0.95)',
        })
      ),
      transition('closed => open', [animate('500ms ease-in-out')]),
      transition('open => closed', [animate('500ms ease-in-out')]),
    ]),
  ],
})
export class DialogErrorComponent {
  private uiService = inject(UIService);
  errorState$ = this.uiService.errorState$;

  closeDialog() {
    this.uiService.hideError();
  }
}
