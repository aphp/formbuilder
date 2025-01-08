import { Component, OnInit } from '@angular/core';
import {Alert} from "../models/alert.model";
import {AlertService} from "../services/alert.service";

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
})
export class AlertComponent implements OnInit {
  alerts: Alert[] = [];

  constructor(private alertService: AlertService) {}

  ngOnInit() {
    this.alertService.alerts$.subscribe((alerts) => {
      this.alerts = alerts;
    });
  }

  closeAlert(id: string) {
    this.alertService.closeAlert(id);
  }
}
