import os
import psutil
from prometheus_client import REGISTRY
from prometheus_client.core import GaugeMetricFamily

_PROCESS = psutil.Process(os.getpid())
# Prime initial cpu_percent baseline
_PROCESS.cpu_percent(interval=None)


class BackendProcessCollector:
    """Collects real-time CPU, memory, and thread metrics on each Prometheus scrape."""

    def collect(self):
        cpu_pct = _PROCESS.cpu_percent(interval=None)
        mem_info = _PROCESS.memory_info()
        mem_pct = _PROCESS.memory_percent()
        num_threads = _PROCESS.num_threads()

        yield GaugeMetricFamily(
            "cloudlab_backend_cpu_percent",
            "Backend process CPU utilization percentage.",
            value=round(cpu_pct, 2),
        )
        yield GaugeMetricFamily(
            "cloudlab_backend_memory_bytes",
            "Backend process resident memory usage in bytes.",
            value=mem_info.rss,
        )
        yield GaugeMetricFamily(
            "cloudlab_backend_memory_percent",
            "Backend process memory utilization percentage.",
            value=round(mem_pct, 2),
        )
        yield GaugeMetricFamily(
            "cloudlab_backend_threads",
            "Number of active threads in the backend process.",
            value=num_threads,
        )


def register_performance_metrics() -> None:
    """Registers the custom process collector once with the default Prometheus registry."""
    REGISTRY.register(BackendProcessCollector())
