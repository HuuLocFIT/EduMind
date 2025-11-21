package com.edumind.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response containing backup codes
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BackupCodesResponse {
    private List<String> backupCodes;
    private String message;

    public BackupCodesResponse(List<String> backupCodes) {
        this.backupCodes = backupCodes;
        this.message = "Save these backup codes in a secure location. Each code can only be used once.";
    }
}