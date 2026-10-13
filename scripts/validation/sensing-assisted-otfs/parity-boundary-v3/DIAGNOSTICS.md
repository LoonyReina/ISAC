# Version 3: lossless checker diagnostics

This additive successor keeps the four version-2 files byte-for-byte. It changes no scientific comparator, input, oracle, reference, census, decision, metric or eleven-path rejection requirement. The scientific parity gate remains FAILED_UNCHANGED.

An independent fault-injection review found that version 2 parsed UTF-8 JSON outside its diagnostic catch. Malformed JSON and non-UTF8 stdout were rejected, but their raw output was omitted from the error. Version 3 moves that strict decoding and parsing into the existing catch and includes base64 copies of both streams, alongside readable UTF-8 replacement text, so binary output is lossless. Unexpected exit status, stderr and semantic failures remain rejected. Timeout failures also retain both partial streams before failing closed. The version string is updated; all scientific checker code is identical to version 2.

The seven original adversarial cases are retained against version 3, followed by five diagnostic cases: malformed JSON, non-UTF8 stdout, unexpected exit/binary stderr, a semantic failure with complete raw report, and a timed-out process with partial binary output. These are controlled test doubles; they do not establish the actual GitHub runner output or a scientific acceptance result.
