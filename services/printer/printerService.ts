import { Transaction, Settings, User } from '../../types';
import { ReceiptBuilder } from './escPos';

// --- Web Serial API Types ---
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  readable: ReadableStream<Uint8Array> | null;
}

interface Serial {
  requestPort(options?: { filters?: any[] }): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

declare global {
  interface Navigator {
    serial: Serial;
  }
}
// ----------------------------

interface PrinterDevice {
  port: SerialPort;
  writer: WritableStreamDefaultWriter<Uint8Array> | null;
}

class PrinterService {
  private device: PrinterDevice | null = null;
  private isConnected: boolean = false;

  async isSupported() {
    return 'serial' in navigator;
  }

  async connect() {
    if (!(await this.isSupported())) {
      throw new Error('Web Serial API not supported in this browser.');
    }

    try {
      // Request user to select a USB device
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      
      const writer = port.writable?.getWriter() || null;
      
      if (writer) {
        this.device = { port, writer };
        this.isConnected = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to connect to printer:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.device) {
      if (this.device.writer) {
        await this.device.writer.close();
      }
      await this.device.port.close();
      this.device = null;
      this.isConnected = false;
    }
  }

  getStatus() {
    return this.isConnected;
  }

  async printReceipt(transaction: Transaction, settings: Settings, employee: User | null) {
    if (!this.isConnected || !this.device?.writer) {
      console.warn("Printer not connected. Attempting to fallback or connect...");
      // In a real scenario, we might try to auto-reconnect here if we had a stored ID
      // For now, we return false to trigger a UI alert
      return false;
    }

    try {
      const builder = new ReceiptBuilder('58mm'); // Defaulting to 58mm for now
      
      // Header
      builder
        .alignCenter()
        .styleHeader()
        .addTextLine(settings.store_name)
        .styleNormal()
        .addTextLine('--------------------------------')
        .alignLeft()
        .addTextLine(`Receipt #: ${transaction.transaction_number}`)
        .addTextLine(`Date: ${new Date(transaction.created_at).toLocaleString()}`)
        .addTextLine(`Cashier: ${employee?.name || 'Staff'}`)
        .drawLine();

      // Items
      builder.alignLeft();
      transaction.items.forEach(item => {
        builder.addTextLine(`${item.name}`);
        builder.addPair(
          `${item.quantity} x ${item.price.toFixed(2)}`, 
          (item.quantity * item.price).toFixed(2)
        );
      });
      
      builder.drawLine();

      // Totals
      builder.addPair('Subtotal:', transaction.subtotal.toFixed(2));
      builder.addPair(`Tax (${(settings.tax_rate * 100).toFixed(0)}%):`, transaction.tax.toFixed(2));
      
      builder.bold(true).addTextLine(' ').addPair('TOTAL:', transaction.total.toFixed(2)).bold(false);

      // Payment Details
      builder.drawLine();
      builder.addPair('Payment Method:', transaction.payment_method.toUpperCase());
      
      if (transaction.payment_method === 'cash') {
        builder.addPair('Tendered:', (transaction.amount_tendered || 0).toFixed(2));
        builder.addPair('Change:', (transaction.change_amount || 0).toFixed(2));
      } else if (transaction.payment_reference) {
         builder.addTextLine(`Ref: ${transaction.payment_reference}`);
      }

      // Footer
      builder
        .feed(1)
        .alignCenter()
        .addTextLine(settings.receipt_footer || 'Thank you for your business!')
        .addTextLine(settings.receipt_header || '') // Using header field as website/phone for now
        .feed(4) // Feed to clear cutter
        .cut();

      // Send to printer
      const data = builder.getBuffer();
      await this.device.writer.write(data);
      
      return true;
    } catch (error) {
      console.error('Printing failed:', error);
      // If write fails, connection might be broken
      this.disconnect(); 
      throw error;
    }
  }

  async testPrint() {
    if (!this.isConnected || !this.device?.writer) throw new Error("Printer not connected");
    
    const builder = new ReceiptBuilder();
    builder
      .alignCenter()
      .styleHeader().addTextLine("TEST PRINT").styleNormal()
      .feed(1)
      .addTextLine("Printer connection successful.")
      .feed(3)
      .cut();
      
    await this.device.writer.write(builder.getBuffer());
  }
}

export const printerService = new PrinterService();