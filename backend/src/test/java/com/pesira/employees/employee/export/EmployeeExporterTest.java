package com.pesira.employees.employee.export;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EmployeeExporterTest {

    @Test
    void leavesPlainValuesUntouched() {
        assertThat(EmployeeExporter.escape("Engineering")).isEqualTo("Engineering");
        assertThat(EmployeeExporter.escape(null)).isEmpty();
    }

    @Test
    void quotesCommasQuotesAndNewlines() {
        assertThat(EmployeeExporter.escape("Doe, Jane")).isEqualTo("\"Doe, Jane\"");
        assertThat(EmployeeExporter.escape("say \"hi\"")).isEqualTo("\"say \"\"hi\"\"\"");
        assertThat(EmployeeExporter.escape("line1\nline2")).isEqualTo("\"line1\nline2\"");
    }

    @Test
    void neutralisesFormulaInjection() {
        assertThat(EmployeeExporter.escape("=HYPERLINK(\"x\")")).startsWith("\"'=");
        assertThat(EmployeeExporter.escape("@SUM(A1)")).isEqualTo("'@SUM(A1)");
        assertThat(EmployeeExporter.escape("+cmd")).isEqualTo("'+cmd");
    }

    @Test
    void keepsPhoneNumbersAndNegativeNumbers() {
        assertThat(EmployeeExporter.escape("+254712000001")).isEqualTo("+254712000001");
        assertThat(EmployeeExporter.escape("-5")).isEqualTo("-5");
    }
}
