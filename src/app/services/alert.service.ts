import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {Alert} from "../models/alert.model";

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  alerts$ = this.alertsSubject.asObservable();

  private currentAlerts: Alert[] = [];

  showAlert(alert: Alert) {
    const id = alert.id || new Date().getTime().toString(); // Unique ID
    const newAlert = { ...alert, id };
    this.currentAlerts.push(newAlert);
    this.alertsSubject.next(this.currentAlerts);


    if (alert.timeout) {
      setTimeout(() => this.closeAlert(id), alert.timeout);
    }
  }

  closeAlert(id: string) {
    this.currentAlerts = this.currentAlerts.filter((alert) => alert.id !== id);
    this.alertsSubject.next(this.currentAlerts);
  }

  clearAll() {
    this.currentAlerts = [];
    this.alertsSubject.next(this.currentAlerts);
  }
}
