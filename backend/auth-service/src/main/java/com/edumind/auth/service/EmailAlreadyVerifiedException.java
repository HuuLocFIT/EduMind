package com.edumind.auth.service;

import com.edumind.common.exception.BadRequestException;

/**
 * Signals the locked re-check observed an already verified user.
 * Kept distinct so the resend flow can hide only this expected race without
 * swallowing unrelated token-issuance failures.
 */
final class EmailAlreadyVerifiedException extends BadRequestException {
    EmailAlreadyVerifiedException() {
        super("Email is already verified");
    }
}
