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
  selector: 'app-dialog-info',
  templateUrl: './dialog-info.component.html',
  styleUrls: ['./dialog-info.component.css'],
  imports: [AsyncPipe],
  standalone: true,

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
export class DialogInfoComponent {
  private uiService = inject(UIService);
  infoState$ = this.uiService.infoState$;

  closeDialog() {
    this.uiService.hideInfo();
  }
} 