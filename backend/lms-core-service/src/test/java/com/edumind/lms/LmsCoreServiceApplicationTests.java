package com.edumind.lms;

import com.edumind.lms.config.PostgresTestContainerConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

@SpringBootTest
@ActiveProfiles("test")
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
class LmsCoreServiceApplicationTests {

	@Test
	void contextLoads() {
	}

}
