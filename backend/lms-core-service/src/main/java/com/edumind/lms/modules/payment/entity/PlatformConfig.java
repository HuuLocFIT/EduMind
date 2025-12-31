package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "platform_config", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PlatformConfig extends BaseEntity {
    @Column(name = "config_key", nullable = false, unique = true, length = 100)
    private String configKey;

    @Column(name = "config_value", nullable = false, length = 500)
    private String configValue;

    @Column(length = 500)
    private String description;

    // Helper methods for type conversion
    public Integer getAsInteger() {
        return Integer.parseInt(configValue);
    }

    public Double getAsDouble() {
        return Double.parseDouble(configValue);
    }

    public Boolean getAsBoolean() {
        return Boolean.parseBoolean(configValue);
    }
}
