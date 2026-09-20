import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/server/observability/sentry";

Sentry.init(sentryOptions());
