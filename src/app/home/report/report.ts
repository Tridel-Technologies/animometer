import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ReportColumn {
  label: string;
  key: string;
  visible: boolean;
}

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './report.html',
  styleUrl: './report.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Report {
  @Input() reportData: any[] = [];
  @Input() reportColumns: ReportColumn[] = [];

  selectedTimeScale: string = 'Day';
  currentPage: number = 1;
  itemsPerPage: number = 10;
  itemsPerPageOptions: number[] = [10, 15, 20];

  get paginatedData(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.reportData.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.reportData.length / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  setTimeScale(scale: string) {
    this.selectedTimeScale = scale;
    this.currentPage = 1; // Reset to first page
  }

  setItemsPerPage(items: number) {
    this.itemsPerPage = items;
    this.currentPage = 1; // Reset to first page
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  toggleColumn(key: string) {
    const col = this.reportColumns.find(c => c.key === key);
    if (col) col.visible = !col.visible;
  }

  exportCSV() {
    // Simple CSV export
    const headers = this.reportColumns.filter(c => c.visible).map(c => c.label).join(',');
    const rows = this.reportData.map(row => 
      this.reportColumns.filter(c => c.visible).map(c => row[c.key]).join(',')
    ).join('\n');
    const csv = headers + '\n' + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  exportExcel() {
    // Placeholder for Excel export
    alert('Excel export not implemented yet');
  }

  exportPDF() {
    // Placeholder for PDF export
    alert('PDF export not implemented yet');
  }
}
