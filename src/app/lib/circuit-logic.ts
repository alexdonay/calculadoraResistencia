import { immerable } from 'immer';
export interface Componente {
    id: string; // ID único para cada instância
    identificador: string;
    tensao_v: number;
    corrente_a: number;
    potencia_w: number;
    resistencia_ohm: number;
    componentes: Componente[];

    calcular_resistencia(): number;
    definir_valores(params: { tensao_v?: number; corrente_a?: number }): void;
    
    coletar_dados(): any[];
    gerar_passos_resolucao(): [string[], number, string];
}

let idCounter = 0;
const nextId = () => `comp_${Date.now()}_${idCounter++}`;

abstract class BaseComponente implements Componente {
    [immerable] = true;
    id: string;
    identificador: string;
    tensao_v = 0;
    corrente_a = 0;
    potencia_w = 0;
    resistencia_ohm = 0;
    componentes: Componente[] = [];

    constructor(identificador: string) {
        this.id = nextId();
        this.identificador = identificador;
    }

    abstract calcular_resistencia(): number;
    abstract gerar_passos_resolucao(): [string[], number, string];

    definir_valores({ tensao_v, corrente_a }: { tensao_v?: number; corrente_a?: number }): void {
        this.resistencia_ohm = this.calcular_resistencia();
        if (tensao_v !== undefined) {
            this.tensao_v = tensao_v;
            this.corrente_a = this.resistencia_ohm > 0 ? tensao_v / this.resistencia_ohm : Infinity;
        } else if (corrente_a !== undefined) {
            this.corrente_a = corrente_a;
            this.tensao_v = corrente_a * this.resistencia_ohm;
        }
        this.potencia_w = this.tensao_v * this.corrente_a;
        this._propagar_valores();
    }
    
    protected _propagar_valores(): void {}
    
    coletar_dados(): any[] {
        return this.componentes.flatMap(c => c.coletar_dados());
    }
}

export class Resistor extends BaseComponente {
    constructor(identificador: string, resistencia: number) {
        super(identificador);
        if (resistencia <= 0) throw new Error("Resistência deve ser positiva.");
        this.resistencia_ohm = resistencia;
    }
    
    calcular_resistencia(): number { return this.resistencia_ohm; }
    
    coletar_dados(): any[] {
        return [{
            "Componente": this.identificador,
            "Resistência (Ω)": this.resistencia_ohm.toFixed(2),
            "Tensão (V)": this.tensao_v.toFixed(2),
            "Corrente (A)": this.corrente_a.toFixed(3),
            "Potência (W)": this.potencia_w.toFixed(2),
        }];
    }

    gerar_passos_resolucao(): [string[], number, string] {
        const desc = `Resistor '${this.identificador}' (${this.resistencia_ohm.toFixed(2)} Ω)`;
        return [[], this.resistencia_ohm, desc];
    }
}

export class GrupoSerie extends BaseComponente {
    constructor(identificador: string) { super(identificador); }

    calcular_resistencia(): number {
        return this.componentes.reduce((acc, comp) => acc + comp.calcular_resistencia(), 0);
    }

    protected _propagar_valores(): void {
        this.componentes.forEach(comp => comp.definir_valores({ corrente_a: this.corrente_a }));
    }

    gerar_passos_resolucao(): [string[], number, string] {
        const passos_acumulados: string[] = [];
        const resistencias_filhos: number[] = [];
        const descricoes_filhos: string[] = [];
        this.componentes.forEach(comp => {
            const [passos_filho, res_filho, desc_filho] = comp.gerar_passos_resolucao();
            passos_acumulados.push(...passos_filho);
            resistencias_filhos.push(res_filho);
            descricoes_filhos.push(desc_filho);
        });
        const res_eq_grupo = resistencias_filhos.reduce((a, b) => a + b, 0);
        if (this.componentes.length > 0) {
            const componentes_str = descricoes_filhos.join(", ");
            const calculo_str = resistencias_filhos.map(r => r.toFixed(2)).join(" + ");
            const passo_atual = `Resolver o '${this.identificador}' (Série).\n  Componentes: ${componentes_str}.\n  Cálculo: R_eq = ${calculo_str} = ${res_eq_grupo.toFixed(2)} Ω.`;
            passos_acumulados.push(passo_atual);
        }
        const desc_grupo = `'${this.identificador}' (agora com ${res_eq_grupo.toFixed(2)} Ω)`;
        return [passos_acumulados, res_eq_grupo, desc_grupo];
    }
}

export class GrupoParalelo extends BaseComponente {
    constructor(identificador: string) { super(identificador); }

    calcular_resistencia(): number {
        const soma_inversos = this.componentes.reduce((acc, comp) => {
            const res = comp.calcular_resistencia();
            return res > 0 ? acc + 1 / res : acc;
        }, 0);
        return soma_inversos > 0 ? 1 / soma_inversos : 0;
    }

    protected _propagar_valores(): void {
        this.componentes.forEach(comp => comp.definir_valores({ tensao_v: this.tensao_v }));
    }

    gerar_passos_resolucao(): [string[], number, string] {
        const passos_acumulados: string[] = [];
        const resistencias_filhos: number[] = [];
        const descricoes_filhos: string[] = [];
        this.componentes.forEach(comp => {
            const [passos_filho, res_filho, desc_filho] = comp.gerar_passos_resolucao();
            passos_acumulados.push(...passos_filho);
            resistencias_filhos.push(res_filho);
            descricoes_filhos.push(desc_filho);
        });
        const soma_inversos = resistencias_filhos.reduce((acc, r) => (r > 0 ? acc + 1 / r : acc), 0);
        const res_eq_grupo = soma_inversos > 0 ? 1 / soma_inversos : 0;
        if (this.componentes.length > 0) {
            const componentes_str = descricoes_filhos.join(", ");
            const calculo_inversos_str = resistencias_filhos.map(r => `1/${r.toFixed(2)}`).join(" + ");
            const passo_atual = `Resolver o '${this.identificador}' (Paralelo).\n  Componentes: ${componentes_str}.\n  Cálculo: 1/R_eq = ${calculo_inversos_str} = ${soma_inversos.toFixed(4)} S.\n  Portanto: R_eq = 1 / ${soma_inversos.toFixed(4)} = ${res_eq_grupo.toFixed(2)} Ω.`;
            passos_acumulados.push(passo_atual);
        }
        const desc_grupo = `'${this.identificador}' (agora com ${res_eq_grupo.toFixed(2)} Ω)`;
        return [passos_acumulados, res_eq_grupo, desc_grupo];
    }
}

export class Circuito {
    tensao_fonte_v: number;
    componente_principal: Componente;

    constructor(tensao_fonte_v: number, componente_principal: Componente) {
        this.tensao_fonte_v = tensao_fonte_v;
        this.componente_principal = componente_principal;
    }

    resolver(): void {
        this.componente_principal.definir_valores({ tensao_v: this.tensao_fonte_v });
    }

    gerar_relatorio_texto(): string {
        const resistencia_total = this.componente_principal.calcular_resistencia();
        const corrente_total = resistencia_total > 0 ? this.tensao_fonte_v / resistencia_total : 0;
        const potencia_total = this.tensao_fonte_v * corrente_total;

        let texto = `--- Relatório do Circuito ---\n`;
        texto += `Tensão da Fonte: ${this.tensao_fonte_v.toFixed(2)} V\n`;
        texto += `Resistência Total: ${resistencia_total.toFixed(2)} Ω\n`;
        texto += `Corrente Total: ${corrente_total.toFixed(3)} A\n`;
        texto += `Potência Total: ${potencia_total.toFixed(2)} W\n\n`;
        texto += "--- Detalhes por Componente ---\n";
        
        const dados = this.componente_principal.coletar_dados();
        if (dados.length > 0) {
            const headers = Object.keys(dados[0]);
            const rows = dados.map(row => headers.map(h => row[h]).join('\t'));
            texto += headers.join('\t') + '\n';
            texto += rows.join('\n');
        } else {
            texto += "Nenhum componente no circuito.";
        }
        return texto;
    }
    
    gerar_tutorial_completo(): string {
        const [passos, res_total] = this.componente_principal.gerar_passos_resolucao();
        let tutorial_texto = "--- Tutorial de Resolução do Circuito ---\n\n";
        tutorial_texto += "Para encontrar a resistência total, simplificamos o circuito de dentro para fora:\n\n";
        passos.forEach((passo, i) => {
            tutorial_texto += `Passo ${i + 1}: ${passo}\n\n`;
        });
        tutorial_texto += "--- Resumo Final ---\n\n";
        tutorial_texto += `A Resistência Total Equivalente do circuito é ${res_total.toFixed(2)} Ω.\n\n`;
        if (res_total > 0) {
            const corrente_total = this.tensao_fonte_v / res_total;
            const potencia_total = this.tensao_fonte_v * corrente_total;
            tutorial_texto += `Corrente Total (I) = V / R_eq = ${this.tensao_fonte_v.toFixed(2)} V / ${res_total.toFixed(2)} Ω = ${corrente_total.toFixed(3)} A.\n`;
            tutorial_texto += `Potência Total (P) = V * I = ${this.tensao_fonte_v.toFixed(2)} V * ${corrente_total.toFixed(3)} A = ${potencia_total.toFixed(2)} W.\n`;
        }
        return tutorial_texto;
    }
}