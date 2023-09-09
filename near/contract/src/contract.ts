import { NearBindgen, near, call, view } from 'near-sdk-js';

type Sale = {
    itemId: number;
    price: number;
    sellerId: string;
};

@NearBindgen({})
export class DueloGame {
    pendingSales: { [saleId: string]: Sale } = {};
    completedSales: { [userId: string]: { [saleId: string]: Sale } } = {};

    @view({})
    get_random_sales({ playerId }: { playerId: string }): { [saleId: string]: Sale } {
        const maxSales = 50;

        const othersSales: Array<[number, [string, Sale]]> = Object.entries(this.pendingSales)
            .filter(([saleId, sale]) => sale.sellerId !== playerId)
            .slice(0, maxSales)
            .map(([saleId, sale]) => [Math.random(), [saleId, sale]]);

        othersSales.sort((a, b) => a[0] - b[0]);
        return Object.fromEntries(othersSales.slice(0, 10).map(s => s[1]));
    }

    @view({})
    get_user_pending_sales({ playerId }: { playerId: string }) {
        return Object.fromEntries(
            Object.entries(this.pendingSales).filter(([saleId, sale]) => sale.sellerId === playerId)
        );
    }

    @view({})
    get_user_completed_sales({ playerId }: { playerId: string }) {
        return this.completedSales[playerId] || {};
    }

    @call({})
    sell({ saleId, itemId, price }: { saleId: string; itemId: number; price: number }): Sale {
        const userId = near.signerAccountId();

        // if user has more than 3 pending sales, don't allow
        let userSaleIds = this.get_user_pending_sales({ playerId: userId });
        if (Object.keys(userSaleIds).length >= 3) {
            return;
        }

        if (this.pendingSales[saleId]) {
            return;
        }

        const sale = {
            itemId,
            price,
            sellerId: userId,
        };

        this.pendingSales[saleId] = sale;
        return sale;
    }

    @call({})
    buy({ saleId }: { saleId: string }): Sale {
        const sale = this.pendingSales[saleId];
        if (sale === null) {
            return;
        }

        const sellerId = sale.sellerId;
        delete this.pendingSales[saleId];
        const sellerCompletedSales = this.get_user_completed_sales({ playerId: sellerId });
        sellerCompletedSales[saleId] = sale;
        this.completedSales[sellerId] = sellerCompletedSales;

        return sale;
    }

    @call({})
    collect_sale({ saleId }: { saleId: string }): Sale {
        const userId = near.signerAccountId();
        const sellerCompletedSales = this.get_user_completed_sales({ playerId: userId });
        const sale = sellerCompletedSales[saleId];
        if (sale === null) {
            return;
        }

        delete sellerCompletedSales[saleId];
        this.completedSales[userId] = sellerCompletedSales;

        return sale;
    }

    @call({})
    cancel_sale({ saleId }: { saleId: string }): Sale {
        const userId = near.signerAccountId();
        const sale = this.pendingSales[saleId];
        if (sale === null) {
            return;
        }

        if (sale.sellerId !== userId) {
            return;
        }

        delete this.pendingSales[saleId];
        return sale;
    }

    @call({})
    reset(): void {
        this.pendingSales = {};
        this.completedSales = {};
    }
}
