import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: "app-tab-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isActive) {
    <div [@fadeIn]>
      <ng-content />
    </div>
    }
  `,
})
export class TabPanelComponent {
  @Input() tabId = "";
  @Input() isActive = false;
}
